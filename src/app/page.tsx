import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-bio-base min-h-screen w-full flex justify-center">
      <div className="root-container">
        {/* Search Bar */}
        <div className="my-8 relative">
          <input
            type="text"
            placeholder="Universal Search"
            className="w-full p-4 bg-bio-surface text-bio-text-primary focus:outline-none border-2 border-bio-border rounded-lg"
          />
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left Panel - 30% */}
          <div className="w-full lg:w-[30%] bg-bio-surface p-5 border-2 border-bio-border rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-bio-primary">Left Panel (30%)</h2>

            <div className="bg-bio-surface p-4 border border-bio-border rounded-md">
              <h3 className="text-lg font-medium mb-3 text-bio-secondary">Navigation</h3>

              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <a href="#" className="text-bio-primary hover:text-opacity-80 transition-colors">Dashboard</a>
                </li>
                <li>
                  <a href="#" className="text-bio-primary hover:text-opacity-80 transition-colors">Search</a>
                </li>
                <li>
                  <a href="#" className="text-bio-primary hover:text-opacity-80 transition-colors">Reports</a>
                </li>
                <li>
                  <a href="#" className="text-bio-primary hover:text-opacity-80 transition-colors">Settings</a>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Panel - 70% */}
          <div className="w-full lg:w-[70%] bg-bio-surface p-5 border-2 border-bio-border rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-bio-primary">Right Panel (70%)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bio-surface p-4 border border-bio-border rounded-md">
                <h3 className="text-lg font-medium mb-3 text-bio-secondary">Recent Activity</h3>
                <p className="text-bio-text-secondary">
                  View your recent scans and activities here.
                </p>
              </div>

              <div className="bg-bio-surface p-4 border border-bio-border rounded-md">
                <h3 className="text-lg font-medium mb-3 text-bio-secondary">Statistics</h3>
                <p className="text-bio-text-secondary">
                  View your performance metrics and statistics.
                </p>
              </div>

              <div className="bg-bio-surface p-4 border border-bio-border rounded-md">
                <h3 className="text-lg font-medium mb-3 text-bio-secondary">Alerts</h3>
                <p className="text-bio-text-secondary">
                  Important notifications and alerts.
                </p>
              </div>

              <div className="bg-bio-surface p-4 border border-bio-border rounded-md">
                <h3 className="text-lg font-medium mb-3 text-bio-secondary">Quick Actions</h3>
                <button className="bg-bio-primary px-4 py-2 rounded-md text-bio-base font-medium hover:bg-opacity-90 transition-colors">
                  New Scan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
