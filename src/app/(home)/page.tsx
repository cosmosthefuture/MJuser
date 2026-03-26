import Home from "./components/home";

export default function HomePage() {
  return <Home />;
}

export async function generateMetadata() {
  return {
    title: "Home Page",
    description: "Welcome to the home page",
  };
}
