import { Outlet } from 'react-router-dom';
import { NavLink } from 'react-router-dom';

export default function MasterDataIndex() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 border-b">
        <NavLink
          to="/master/vendor"
          className={({ isActive }) =>
            `px-4 py-2 font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          Master Vendor
        </NavLink>
        <NavLink
          to="/master/cluster"
          className={({ isActive }) =>
            `px-4 py-2 font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          Master Cluster
        </NavLink>
        <NavLink
          to="/master/kontraktor"
          className={({ isActive }) =>
            `px-4 py-2 font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          Master Kontraktor
        </NavLink>
      </div>
      <Outlet />
    </div>
  );
}
