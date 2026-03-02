import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
      <Link to="/" className="text-xl font-bold text-blue-600 no-underline">
        skillme
      </Link>
    </header>
  );
}
