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
            <a className="flex text-sm items-center justify-between px-3 py-2 rounded-lg bg-blue-600 text-white font-medium">
              <span>Dashboard</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-400 text-green-900 font-semibold">new</span>
            </a>
            <a className="flex text-sm  items-center justify-between px-3 py-2 rounded-lg text-red-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
              <span>Bulk Delete</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">2,847</span>
            </a>
            <a className="flex text-sm items-center justify-between px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
              <span>Unsubscribe</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">24</span>
            </a>
            <a className="flex text-sm items-center px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
              Archive
            </a>
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