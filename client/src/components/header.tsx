import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Welcome, {user?.username}
          </span>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.username?.[0]?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
