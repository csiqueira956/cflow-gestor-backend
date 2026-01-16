import logoImg from '../assets/Logo.png';
import logoIcon from '../assets/image.png';

const Logo = ({ className = 'w-10 h-10', showText = true }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Logo CFlow */}
      <img
        src={showText ? logoImg : logoIcon}
        alt="CFlow Gestor"
        className={showText ? 'h-12 w-auto' : className}
      />
    </div>
  );
};

export default Logo;
