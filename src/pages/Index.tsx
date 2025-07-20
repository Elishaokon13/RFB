import { TokenTable } from "@/components/TokenTable";
import Trending from "@/components/Trending";

const Index = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Trending />
      <TokenTable />
    </div>
  );
};

export default Index;