import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Log the 404 error
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // Handle specific redirect case for token paths with "/from-token"
    if (location.pathname.includes("/token/") && location.pathname.includes("/from-token")) {
      // Extract the token address from the path
      const match = location.pathname.match(/\/token\/([^/]+)(\/from-token.*)?/);
      if (match && match[1]) {
        const tokenAddress = match[1];
        // Redirect to the base token page
        console.log(`Redirecting from ${location.pathname} to /token/${tokenAddress}`);
        navigate(`/token/${tokenAddress}`, { replace: true });
        return;
      }
    }
  }, [location.pathname, navigate]);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated 404 with floating effect */}
        <div className="relative mb-8">
          <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse">
            404
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-bounce"></div>
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-pink-400 rounded-full animate-bounce delay-300"></div>
        </div>

        {/* Main message */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800 mb-3">
            Oops! Page not found
          </h1>
          <p className="text-gray-600 leading-relaxed">
            The page you're looking for doesn't exist or has been moved. Don't
            worry, it happens to the best of us!
          </p>
          {location.pathname && (
            <p className="text-sm text-gray-500 mt-2 font-mono bg-gray-100 px-3 py-1 rounded-md inline-block">
              {location.pathname}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoBack}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <a
            href="/"
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg border border-gray-200 transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <Home size={18} />
            Return to Home
          </a>
        </div>

        {/* Additional help section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">
            Still can't find what you're looking for?
          </p>
          <div className="flex gap-2 justify-center">
            <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
              <Search size={14} />
              Search
            </button>
            <span className="text-gray-300">•</span>
            <a
              href="/contact"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400 rounded-full opacity-30 animate-ping"></div>
        <div className="absolute bottom-20 right-10 w-3 h-3 bg-purple-400 rounded-full opacity-20 animate-pulse"></div>
      </div>
    </div>
  );
};

export default NotFound;
