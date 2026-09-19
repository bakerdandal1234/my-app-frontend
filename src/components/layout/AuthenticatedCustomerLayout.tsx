import { Outlet } from 'react-router-dom';

import { useCustomerAuth } from '../../customer/CustomerAuthContext';
import AppHeader from './AppHeader';
import CustomerMenu from './CustomerMenu';

function AuthenticatedCustomerLayout() {
  const { account, logout } = useCustomerAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AppHeader
        appName="FlowDesk"
        actions={
          account ? (
            <CustomerMenu
              account={account}
              onLogout={logout}
            />
          ) : null
        }
      />

      <Outlet />
    </div>
  );
}

export default AuthenticatedCustomerLayout;