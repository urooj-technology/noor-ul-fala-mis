"""
File handler for automatic file renaming and image compression
Renames files with UUID + timestamp and compresses images without quality loss
"""

import os
import uuid
from io import BytesIO
from datetime import datetime
from django.conf import settings
from PIL import Image
import logging

logger = logging.getLogger(__name__)


def generate_unique_filename(filename, include_timestamp=True):
    """
    Generate a unique filename using UUID
    
    Args:
        filename: Original filename
        include_timestamp: Whether to include timestamp in the filename
    
    Returns:
        str: Unique filename with original extension
    """
    ext = os.path.splitext(filename)[1].lower()
    
    if include_timestamp:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        return f"{timestamp}_{unique_id}{ext}"
    
    return f"{uuid.uuid4()}{ext}"


def compress_image(image_file, quality=95, max_dimensions=(1920, 1920)):
    """
    Compress image while maintaining quality
    
    Args:
        image_file: InMemoryUploadedFile or file-like object
        quality: Compression quality (1-100, higher = better quality)
        max_dimensions: Maximum (width, height) in pixels
    
    Returns:
        BytesIO: Compressed image as BytesIO object
    """
    try:
        # Open the image
        img = Image.open(image_file)
        
        # Get original format
        original_format = img.format or 'JPEG'
        
        # Convert RGBA to RGB if saving as JPEG
        if original_format == 'JPEG' and img.mode == 'RGBA':
            # Create white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])  # 3 is the alpha channel
            img = background
        
        # Resize if needed while maintaining aspect ratio
        if max_dimensions and (img.width > max_dimensions[0] or img.height > max_dimensions[1]):
            img.thumbnail(max_dimensions, Image.Resampling.LANCZOS)
        
        # Create BytesIO object for compressed image
        output = BytesIO()
        
        # Save with compression
        if original_format == 'PNG':
            # PNG compression (lossless)
            img.save(output, format='PNG', optimize=True)
        elif original_format == 'GIF':
            # GIF preserves animation
            img.save(output, format='GIF', optimize=True)
        elif original_format in ['WEBP', 'JPEG', 'JPG']:
            # JPEG/WEBP with specified quality
            save_format = 'JPEG' if original_format in ['JPEG', 'JPG'] else 'WEBP'
            img.save(output, format=save_format, quality=quality, optimize=True)
        else:
            # Default to JPEG for other formats
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(output, format='JPEG', quality=quality, optimize=True)
        
        output.seek(0)
        
        # Log compression result
        original_size = image_file.size if hasattr(image_file, 'size') else 0
        compressed_size = output.getbuffer().nbytes
        if original_size > 0:
            reduction = ((original_size - compressed_size) / original_size) * 100
            logger.info(
                f"Image compressed: {original_size} → {compressed_size} bytes "
                f"({reduction:.1f}% reduction)"
            )
        
        return output
        
    except Exception as e:
        logger.error(f"Error compressing image: {e}")
        # Return original file if compression fails
        if hasattr(image_file, 'seek'):
            image_file.seek(0)
        return image_file


def process_uploaded_file(file, upload_to, compress_images=True):
    """
    Process uploaded file: rename and optionally compress
    
    Args:
        file: Uploaded file object
        upload_to: Destination directory path
        compress_images: Whether to compress images
    
    Returns:
        tuple: (processed_file, new_filename)
    """
    if not file:
        return None, None
    
    original_name = file.name
    ext = os.path.splitext(original_name)[1].lower()
    
    # Generate unique filename
    new_filename = generate_unique_filename(original_name)
    
    # Determine if file is an image
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    
    if compress_images and ext in image_extensions:
        try:
            # Compress the image
            compressed = compress_image(file)
            
            # Create a new file-like object with the compressed data
            from django.core.files.uploadedfile import InMemoryUploadedFile
            
            # Determine content type
            content_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else f'image/{ext[1:]}'
            
            processed_file = InMemoryUploadedFile(
                file=compressed,
                field_name=file.field_name if hasattr(file, 'field_name') else None,
                name=new_filename,
                content_type=content_type,
                size=compressed.getbuffer().nbytes,
                charset=None
            )
            
            logger.info(f"Processed file: {original_name} → {new_filename} (image compressed)")
            return processed_file, new_filename
            
        except Exception as e:
            logger.error(f"Error processing image {original_name}: {e}")
            # Fall back to just renaming
            file.name = new_filename
            return file, new_filename
    else:
        # Just rename the file
        file.name = new_filename
        logger.info(f"Processed file: {original_name} → {new_filename} (non-image, renamed only)")
        return file, new_filename


def get_file_upload_path(instance, filename, folder_name=None):
    """
    Generate upload path for file
    
    Args:
        instance: Model instance
        filename: Original filename
        folder_name: Optional custom folder name
    
    Returns:
        str: Upload path with unique filename
    """
    # Get model name for folder structure
    model_name = instance.__class__.__name__.lower()
    
    # Generate unique filename
    new_filename = generate_unique_filename(filename)
    
    # Build path
    if folder_name:
        return os.path.join(model_name, folder_name, new_filename)
    
    return os.path.join(model_name, new_filename)


def cleanup_old_file(instance, field_name):
    """
    Delete old file when updating a file field
    
    Args:
        instance: Model instance
        field_name: Name of the file field
    """
    try:
        old_file = getattr(instance, field_name)
        if old_file and hasattr(old_file, 'path'):
            if os.path.isfile(old_file.path):
                os.remove(old_file.path)
                logger.info(f"Deleted old file: {old_file.path}")
    except Exception as e:
        logger.error(f"Error deleting old file: {e}")


class FileUploadMixin:
    """
    Mixin for models to handle file uploads automatically
    
    Usage in models:
        class MyModel(FileUploadMixin, BaseModel):
            photo = models.ImageField(upload_to='photos/')
            document = models.FileField(upload_to='documents/')
            
            FILE_FIELDS = ['photo', 'document']
            IMAGE_FIELDS = ['photo']
    """
    
    # Override in model
    FILE_FIELDS = []
    IMAGE_FIELDS = []
    
    def save(self, *args, **kwargs):
        # Process file fields before saving
        for field_name in self.FILE_FIELDS:
            file_field = getattr(self, field_name)
            if file_field and hasattr(file_field, 'name'):
                # Check if this is a new file
                if hasattr(file_field, 'file') and hasattr(file_field.file, 'name'):
                    original_name = file_field.file.name
                    if original_name and not original_name.startswith(self._meta.model_name):
                        # Process the file
                        processed, new_name = process_uploaded_file(
                            file_field.file,
                            file_field.field.upload_to,
                            compress_images=(field_name in self.IMAGE_FIELDS)
                        )
                        
                        # Clean up old file if updating
                        if self.pk:
                            try:
                                old_instance = self.__class__.objects.get(pk=self.pk)
                                cleanup_old_file(old_instance, field_name)
                            except self.__class__.DoesNotExist:
                                pass
                        
                        # Update the field
                        if processed:
                            file_field.save(new_name, processed, save=False)
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Clean up files on delete
        for field_name in self.FILE_FIELDS:
            cleanup_old_file(self, field_name)
        
        super().delete(*args, **kwargs)
