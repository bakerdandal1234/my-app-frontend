import { Outlet } from 'react-router-dom';
import { CustomerAuthProvider } from './CustomerAuthContext';

/**
 * Route element that scopes the customer session to the /customer subtree.
 * Nothing on the staff side of the app mounts this, so the two sessions
 * never interact.
 */
function CustomerAuthLayout() {
  return (
    <CustomerAuthProvider>
      <Outlet />
    </CustomerAuthProvider>
  );
}

export default CustomerAuthLayout;
