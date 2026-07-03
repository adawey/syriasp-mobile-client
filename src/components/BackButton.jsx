import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function BackButton({ to, label = 'رجوع' }) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (to) {
            navigate(to);
        } else {
            navigate(-1);
        }
    };

    return (
        <button onClick={handleBack} className="flex items-center gap-1 text-blue-600 text-sm font-medium mb-3">
            <ArrowRight size={16} />
            {label}
        </button>
    );
}
