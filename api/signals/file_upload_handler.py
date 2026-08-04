"""
Signal handlers for automatic file upload processing
Renames files with UUID + timestamp and compresses images automatically
"""

import os
import logging
from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile
from ..utils.file_handler import (
    generate_unique_filename,
    compress_image,
    cleanup_old_file
)

logger = logging.getLogger(__name__)


# Model-specific file field configurations
FILE_FIELDS_CONFIG = {
    # User model
    'user': {
        'model_path': 'account.User',
        'file_fields': ['profile_picture'],
        'image_fields': ['profile_picture'],
    },
    # Student model
    'student': {
        'model_path': 'api.Student',
        'file_fields': ['photo', 'tazkira_copy', 'parent_tazkira_copy', 'previous_result_card', 'payment_receipt'],
        'image_fields': ['photo'],
    },
    # Expense model
    'expense': {
        'model_path': 'api.Expense',
        'file_fields': ['receipt'],
        'image_fields': [],
    },
    # ShopRentalPayment model
    'shoprentalpayment': {
        'model_path': 'api.ShopRentalPayment',
        'file_fields': ['receipt'],
        'image_fields': [],
    },
    # OtherIncome model
    'otherincome': {
        'model_path': 'api.OtherIncome',
        'file_fields': ['receipt'],
        'image_fields': [],
    },
}


def get_file_fields_for_model(model):
    """Get file field configuration for a model"""
    model_name = model.__name__.lower()
    return FILE_FIELDS_CONFIG.get(model_name, {})


def is_new_file(file_attr):
    """Check if this is a newly uploaded file (not yet renamed)"""
    if not file_attr:
        return False
    
    # Check if it's an uploaded file
    if isinstance(file_attr, (InMemoryUploadedFile, TemporaryUploadedFile)):
        return True
    
    # Check if file exists but hasn't been processed yet
    if hasattr(file_attr, 'name') and file_attr.name:
        # If the name doesn't contain our timestamp pattern, it's new
        import re
        # Our pattern: YYYYMMDD_HHMMSS_uuid.ext
        if not re.search(r'\d{8}_\d{6}_[a-f0-9]{8}', file_attr.name):
            return True
    
    return False


def process_file_field(instance, field_name, is_image=False):
    """
    Process a file field: rename and optionally compress images
    
    Args:
        instance: Model instance
        field_name: Name of the file field
        is_image: Whether this is an image field (should be compressed)
    
    Returns:
        bool: True if file was processed
    """
    try:
        file_attr = getattr(instance, field_name)
        
        if not file_attr or not is_new_file(file_attr):
            return False
        
        # Get original filename
        if hasattr(file_attr, 'name'):
            original_name = file_attr.name
        elif hasattr(file_attr, 'file') and hasattr(file_attr.file, 'name'):
            original_name = os.path.basename(file_attr.file.name)
        else:
            original_name = f"{field_name}.dat"
        
        # Get file extension
        ext = os.path.splitext(original_name)[1].lower()
        
        # Generate unique filename
        new_filename = generate_unique_filename(original_name)
        
        # Process based on file type
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
        
        if is_image and ext in image_extensions:
            try:
                # Get file object
                if hasattr(file_attr, 'file'):
                    file_obj = file_attr.file
                else:
                    file_obj = file_attr
                
                # Read file content
                if hasattr(file_obj, 'read'):
                    file_obj.seek(0)
                    content = file_obj.read()
                elif hasattr(file_obj, 'open'):
                    with file_obj.open('rb') as f:
                        content = f.read()
                else:
                    content = None
                
                if content:
                    from io import BytesIO
                    file_input = BytesIO(content)
                    file_input.name = original_name
                    
                    # Compress image
                    from PIL import Image
                    img = Image.open(file_input)
                    
                    # Determine format
                    img_format = img.format or 'JPEG'
                    if img_format == 'JPG':
                        img_format = 'JPEG'
                    
                    # Convert RGBA to RGB for JPEG
                    if img_format == 'JPEG' and img.mode == 'RGBA':
                        from PIL import Image
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        background.paste(img, mask=img.split()[3])
                        img = background
                    
                    # Resize if too large
                    max_dimensions = (1920, 1920)
                    if img.width > max_dimensions[0] or img.height > max_dimensions[1]:
                        img.thumbnail(max_dimensions, Image.Resampling.LANCZOS)
                    
                    # Save to BytesIO
                    output = BytesIO()
                    if img_format == 'PNG':
                        img.save(output, format='PNG', optimize=True)
                    elif img_format == 'GIF':
                        img.save(output, format='GIF', optimize=True)
                    else:
                        img.save(output, format='JPEG', quality=95, optimize=True)
                    
                    output.seek(0)
                    
                    # Create new InMemoryUploadedFile
                    from django.core.files.uploadedfile import InMemoryUploadedFile
                    content_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else f'image/{ext[1:]}'
                    
                    processed_file = InMemoryUploadedFile(
                        file=output,
                        field_name=field_name,
                        name=new_filename,
                        content_type=content_type,
                        size=output.getbuffer().nbytes,
                        charset=None
                    )
                    
                    # Save the processed file
                    file_attr.save(new_filename, processed_file, save=False)
                    
                    logger.info(f"Processed image: {original_name} → {new_filename} (compressed)")
                    return True
                    
            except Exception as e:
                logger.error(f"Error processing image {field_name}: {e}")
                # Fall back to just renaming
                file_attr.name = new_filename
                logger.info(f"Processed file: {original_name} → {new_filename} (rename only, compression failed)")
                return True
        else:
            # Non-image file - just rename
            file_attr.name = new_filename
            logger.info(f"Processed file: {original_name} → {new_filename} (renamed)")
            return True
        
    except Exception as e:
        logger.error(f"Error processing file field {field_name}: {e}")
        return False


def connect_signal_handlers():
    """Connect signal handlers to all models with file fields"""
    from django.apps import apps
    
    for model_key, config in FILE_FIELDS_CONFIG.items():
        try:
            # Get the model class
            model = apps.get_model(config['model_path'])
            
            # Create a pre_save handler for this model
            @receiver(pre_save, sender=model)
            def handle_file_upload(sender, instance, **kwargs):
                """Handle file uploads before saving"""
                model_name = instance.__class__.__name__.lower()
                config = FILE_FIELDS_CONFIG.get(model_name, {})
                
                if not config:
                    return
                
                file_fields = config.get('file_fields', [])
                image_fields = config.get('image_fields', [])
                
                for field_name in file_fields:
                    # Clean up old file if updating
                    if instance.pk:
                        try:
                            old_instance = sender.objects.get(pk=instance.pk)
                            old_file = getattr(old_instance, field_name)
                            new_file = getattr(instance, field_name)
                            
                            # Only delete old file if it's different
                            if old_file and new_file and old_file != new_file:
                                cleanup_old_file(old_instance, field_name)
                        except sender.DoesNotExist:
                            pass
                    
                    # Process the file
                    is_image = field_name in image_fields
                    process_file_field(instance, field_name, is_image)
            
            # Create a post_delete handler for this model
            @receiver(post_delete, sender=model)
            def handle_file_delete(sender, instance, **kwargs):
                """Delete files when model instance is deleted"""
                model_name = instance.__class__.__name__.lower()
                config = FILE_FIELDS_CONFIG.get(model_name, {})
                
                if not config:
                    return
                
                for field_name in config.get('file_fields', []):
                    cleanup_old_file(instance, field_name)
            
            handler_name = f'handle_{model_key}_file_upload'
            handle_file_upload.__name__ = handler_name
            
            delete_handler_name = f'handle_{model_key}_file_delete'
            handle_file_delete.__name__ = delete_handler_name
            
            logger.info(f"Connected file upload signals for {model.__name__}")
            
        except Exception as e:
            logger.error(f"Failed to connect signals for {config['model_path']}: {e}")


# Auto-connect when this module is imported
# This will be called from apps.py ready() method
