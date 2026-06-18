from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.services.deleted_items_service import list_deleted_items, restore_deleted_items


class DeletedItemsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        model_key = request.query_params.get('model', 'all')
        search = request.query_params.get('search', '').strip()
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 25))))
        except (TypeError, ValueError):
            page = 1
            page_size = 25

        data = list_deleted_items(model_key=model_key, search=search, page=page, page_size=page_size)
        return Response(data, status=status.HTTP_200_OK)


class DeletedItemsRestoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        items = request.data.get('items', [])
        if not isinstance(items, list) or not items:
            return Response(
                {'detail': 'Provide a non-empty items array with model and id.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        restored, errors = restore_deleted_items(items)
        status_code = status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS
        return Response(
            {
                'restored_count': len(restored),
                'error_count': len(errors),
                'restored': restored,
                'errors': errors,
            },
            status=status_code,
        )
