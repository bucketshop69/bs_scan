import LatestTx from "./components/LatestTx";
import MenuButton from "./components/MenuButton";
import SearchBar from "./components/SearchBar";

export default function Home() {
  return (
    <div className="bg-bio-base min-h-screen w-full flex justify-center">
      <div className="root-container flex flex-col h-screen w-full">
        {/* Search Bar */}
        <SearchBar />

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-5 flex-grow overflow-auto min-h-0">
          {/* Left Panel - Latest Transactions Component */}
          <div className="w-full lg:w-[30%] flex flex-col bg-bio-surface p-3 border-2 border-bio-border rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold">All Solana Activity</h2>
              <MenuButton>
                <div className="p-3">
                  <div className="flex items-center">
                    <span className="text-sm">Network Status</span>
                  </div>
                </div>
              </MenuButton>
            </div>
            <div className="flex-grow min-h-0">
              {/* <LatestTx hideHeader={true} className="border-0" customAccount="" /> */}
            </div>
          </div>

          {/* Right Panel - 70% */}
          <div className="w-full lg:w-[70%] bg-bio-surface p-3 border-2 border-bio-border rounded-lg flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-bio-primary">Top Defi Protocols</h2>
              <MenuButton>
                <div className="p-3">
                  <div className="flex items-center">
                    <span className="text-sm">View Options</span>
                  </div>
                </div>
              </MenuButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-auto grid-rows-2 auto-rows-fr">
              <div className="bg-bio-surface p-2 border border-bio-border rounded-md flex flex-col h-full">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-bio-secondary">PumpFun</h3>
                  <MenuButton>
                    <div className="p-3">
                      <div className="flex items-center">
                        <span className="text-sm">Protocol Options</span>
                      </div>
                    </div>
                  </MenuButton>
                </div>
                <div className="flex-grow min-h-0">
                  {/* <LatestTx isNested={true} hideHeader={true} className="border-0" customAccount="pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA" /> */}
                </div>
              </div>

              <div className="bg-bio-surface p-2 border border-bio-border rounded-md flex flex-col h-full">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-bio-secondary">Jupiter</h3>
                  <MenuButton>
                    <div className="p-3">
                      <div className="flex items-center">
                        <span className="text-sm">Protocol Options</span>
                      </div>
                    </div>
                  </MenuButton>
                </div>
                <div className="flex-grow min-h-0">
                  {/* <LatestTx isNested={true} hideHeader={true} className="border-0" customAccount="JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" /> */}
                </div>
              </div>

              <div className="bg-bio-surface p-2 border border-bio-border rounded-md flex flex-col h-full">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-bio-secondary">Raydium</h3>
                  <MenuButton>
                    <div className="p-3">
                      <div className="flex items-center">
                        <span className="text-sm">Protocol Options</span>
                      </div>
                    </div>
                  </MenuButton>
                </div>
                <div className="flex-grow min-h-0">
                  {/* <LatestTx isNested={true} hideHeader={true} className="border-0" customAccount="CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C" /> */}
                </div>
              </div>

              <div className="bg-bio-surface p-2 border border-bio-border rounded-md flex flex-col h-full">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-bio-secondary">Meteora</h3>
                  <MenuButton>
                    <div className="p-3">
                      <div className="flex items-center">
                        <span className="text-sm">Protocol Options</span>
                      </div>
                    </div>
                  </MenuButton>
                </div>
                <div className="flex-grow min-h-0">
                  {/* <LatestTx isNested={true} hideHeader={true} className="border-0" customAccount="LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo" /> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
