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
import ShopRentalReportPage from '@/pages/shop-rental/ShopRentalReportPage';
import { guardRoute } from '@/lib/route-guards';

const rental = { module: 'shop_rentals' as const };

export const shopRentalRoutes = (
  <>
    <Route path="shops" element={guardRoute(<ShopRentalList />, rental)} />
    <Route path="shops/add" element={guardRoute(<AddShop />, { ...rental, action: 'create' })} />
    <Route path="shops/:id/edit" element={guardRoute(<EditShop />, { ...rental, action: 'edit' })} />

    <Route path="tenants" element={guardRoute(<TenantList />, rental)} />
    <Route path="tenants/add" element={guardRoute(<AddTenant />, { ...rental, action: 'create' })} />
    <Route path="tenants/:id/edit" element={guardRoute(<EditTenant />, { ...rental, action: 'edit' })} />

    <Route path="shop-rentals" element={guardRoute(<ShopRentalListPage />, rental)} />
    <Route path="shop-rentals/add" element={guardRoute(<AddShopRental />, { ...rental, action: 'create' })} />
    <Route path="shop-rentals/:id" element={guardRoute(<ShopRentalDetails />, rental)} />
    <Route path="shop-rentals/:id/edit" element={guardRoute(<EditShopRental />, { ...rental, action: 'edit' })} />

    <Route path="shop-rental-payments" element={guardRoute(<ShopRentalPaymentList />, rental)} />
    <Route path="shop-rental-payments/add" element={guardRoute(<AddShopRentalPayment />, { ...rental, action: 'create' })} />
    <Route path="shop-rental-payments/:id" element={guardRoute(<ShopRentalPaymentDetails />, rental)} />
    <Route path="shop-rental-payments/:id/edit" element={guardRoute(<EditShopRentalPayment />, { ...rental, action: 'edit' })} />

    <Route path="shop-rental-reports" element={guardRoute(<ShopRentalReportPage />, rental)} />
  </>
);
