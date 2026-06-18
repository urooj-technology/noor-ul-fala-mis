from django.views.generic import View
from django.http import HttpResponse, Http404
from django.conf import settings
import os
import mimetypes

class FrontendView(View):
    def get(self, request, path=''):
        # Unmatched API routes must not fall back to the SPA shell (index.html).
        if path == 'api' or path.startswith('api/'):
            raise Http404("API endpoint not found")

        frontend_dir = os.path.join(settings.BASE_DIR, 'static', 'frontend')
        
        if path:
            file_path = os.path.join(frontend_dir, path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                content_type, _ = mimetypes.guess_type(file_path)
                with open(file_path, 'rb') as f:
                    return HttpResponse(f.read(), content_type=content_type)
        
        index_path = os.path.join(frontend_dir, 'index.html')
        if os.path.exists(index_path):
            with open(index_path, 'r') as f:
                return HttpResponse(f.read(), content_type='text/html')
        
        raise Http404()
