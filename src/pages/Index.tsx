import { TokenTable } from "@/components/TokenTable";
import Trending from "@/components/Trending";
import UseZoracle from "@/components/UseZoracle";

const Index = () => {
  return (
    <div className="w-full mx-auto space-y-4 sm:space-y-6">
      <UseZoracle />
      <Trending />
      <TokenTable />
    </div>
  );
};

export default Index;
