import { TokenTable } from "@/components/TokenTable";
import Trending from "@/components/Trending";
// import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="w-full mx-auto">
      <Trending />
      <TokenTable />
      {/* <Footer /> */}
    </div>
  );
};

export default Index;