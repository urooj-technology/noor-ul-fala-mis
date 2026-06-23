import { Route } from 'react-router-dom';
import { guardRoute } from '@/lib/route-guards';
import EquipmentList from '@/pages/equipment/EquipmentList';
import AddEquipment from '@/pages/equipment/AddEquipment';
import EquipmentDetails from '@/pages/equipment/EquipmentDetails';
import EquipmentCategoryList from '@/pages/equipment/EquipmentCategoryList';
import AddEquipmentCategory from '@/pages/equipment/AddEquipmentCategory';

export const equipmentRoutes = (
  <>
    <Route path="equipment" element={guardRoute(<EquipmentList />, { module: 'equipment' })} />
    <Route path="equipment/add" element={guardRoute(<AddEquipment />, { module: 'equipment', action: 'create' })} />
    <Route path="equipment/:id" element={guardRoute(<EquipmentDetails />, { module: 'equipment' })} />
    <Route path="equipment/:id/edit" element={guardRoute(<AddEquipment />, { module: 'equipment', action: 'edit' })} />
    <Route path="equipment-categories" element={guardRoute(<EquipmentCategoryList />, { module: 'equipment' })} />
    <Route path="equipment-categories/add" element={guardRoute(<AddEquipmentCategory />, { module: 'equipment', action: 'create' })} />
    <Route path="equipment-categories/:id/edit" element={guardRoute(<AddEquipmentCategory />, { module: 'equipment', action: 'edit' })} />
  </>
);
