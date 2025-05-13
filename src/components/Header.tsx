
import React from 'react';
import { Clock } from 'lucide-react';

interface HeaderProps {
  title: string;
  connectionStatus: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, connectionStatus }) => {
  const currentTime = new Date().toLocaleTimeString();
  const [time, setTime] = React.useState(currentTime);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-darkBg border-b border-darkBorder h-14 flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className={`ml-4 px-3 py-1 text-xs rounded-full ${connectionStatus ? 'bg-green-900/30 text-positive' : 'bg-red-900/30 text-negative'}`}>
          {connectionStatus ? 'CONNECTED' : 'DISCONNECTED'}
        </div>
      </div>
      <div className="flex items-center text-muted-foreground">
        <Clock className="h-4 w-4 mr-2" />
        <span className="text-sm font-mono">{time}</span>
      </div>
    </header>
  );
};

export default Header;
