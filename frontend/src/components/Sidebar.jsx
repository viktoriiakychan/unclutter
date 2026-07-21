import { NavLink } from 'react-router-dom'
import broomIcon from "../assets/broom.png";


function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">

      {/* ----- LOGO -----*/}
      <div className="px-6 py-5 flex items-center ">
        <span className="font-bold text-2xl tracking-tight">unclutter<span className="text-blue-600">.</span></span>
      </div>

      <nav className="px-3 mt-2 space-y-1">
        {/* group 1 - clean */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Clean
          </p>

          <div className="space-y-1">

            <NavLink 
                to="/"
                end
                className={({ isActive }) =>
                  `flex text-sm items-center justify-between px-3 py-2 rounded-lg font-medium ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`
                }
                >
              <span>Dashboard</span>
            </NavLink>
            
            <NavLink
                to="/cleanup"
                className={({ isActive }) =>
                  `flex text-sm items-center justify-between px-3 py-2 rounded-lg ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-red-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`
                }
                >
                <span>Clean up</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">2,847</span>
            </NavLink>
            <NavLink
                to="/archive"
                className={({ isActive }) =>
                  `flex text-sm items-center px-3 py-2 rounded-lg ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`
                }
                >
              Archive
            </NavLink>
          </div>
        </div>

        {/* group 2 - analyse */}
        <div>
          <p className="px-3 mt-8 mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Analyse
          </p>

          <div className="space-y-1">
            <a className="flex items-center text-sm px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
              Inbox Stats
            </a>
            <a className="flex items-center text-sm px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
              Top Senders
            </a>
          </div>
        </div>

      </nav>
    </aside>
  );
}

export default Sidebar;