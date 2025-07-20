import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { TokenTable } from "@/components/TokenTable";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex relative">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <TokenTable />
      </div>
    </div>
  );
};

export default Index;
