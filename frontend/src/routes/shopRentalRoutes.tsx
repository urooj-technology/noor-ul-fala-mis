import { Route } from 'react-router-dom';
import ShopRentalList from '@/pages/shop-rental/ShopRentalList';
import AddShop from '@/pages/shop-rental/AddShop';
import EditShop from '@/pages/shop-rental/EditShop';
import TenantList from '@/pages/shop-rental/TenantList';
import AddTenant from '@/pages/shop-rental/AddTenant';
import EditTenant from '@/pages/shop-rental/EditTenant';
import ShopRentalListPage from '@/pages/shop-rental/ShopRentalListPage';
import ShopRentalDetails from '@/pages/shop-rental/ShopRentalDetails';
import AddShopRental from '@/pages/shop-rental/AddShopRental';
import EditShopRental from '@/pages/shop-rental/EditShopRental';
import ShopRentalPaymentList from '@/pages/shop-rental/ShopRentalPaymentList';
import AddShopRentalPayment from '@/pages/shop-rental/AddShopRentalPayment';
import EditShopRentalPayment from '@/pages/shop-rental/EditShopRentalPayment';
import ShopRentalPaymentDetails from '@/pages/shop-rental/ShopRentalPaymentDetails';

export const shopRentalRoutes = (
  <>
    {/* Shops */}
    <Route path="shops" element={<ShopRentalList />} />
    <Route path="shops/add" element={<AddShop />} />
    <Route path="shops/:id/edit" element={<EditShop />} />
    
    {/* Tenants */}
    <Route path="tenants" element={<TenantList />} />
    <Route path="tenants/add" element={<AddTenant />} />
    <Route path="tenants/:id/edit" element={<EditTenant />} />
    
    {/* Shop Rentals */}
    <Route path="shop-rentals" element={<ShopRentalListPage />} />
    <Route path="shop-rentals/add" element={<AddShopRental />} />
    <Route path="shop-rentals/:id" element={<ShopRentalDetails />} />
    <Route path="shop-rentals/:id/edit" element={<EditShopRental />} />
    
    {/* Shop Rental Payments */}
    <Route path="shop-rental-payments" element={<ShopRentalPaymentList />} />
    <Route path="shop-rental-payments/add" element={<AddShopRentalPayment />} />
    <Route path="shop-rental-payments/:id" element={<ShopRentalPaymentDetails />} />
    <Route path="shop-rental-payments/:id/edit" element={<EditShopRentalPayment />} />
  </>
);
