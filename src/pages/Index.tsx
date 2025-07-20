import { TokenTable } from "@/components/TokenTable";
import Trending from "@/components/Trending";
// import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Trending />
      <TokenTable />
      {/* <Footer /> */}
    </div>
  );
};

export default Index;