import { TokenTable } from "@/components/TokenTable";
import Trending from "@/components/Trending";

const Index = () => {
  return (
    <div className="w-full mx-auto space-y-4 sm:space-y-6">
      <Trending />
      <TokenTable />
    </div>
  );
};

export default Index;