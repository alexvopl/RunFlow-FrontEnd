import { useNavigate, useParams } from 'react-router-dom';
import { JoinClanModal } from '../components/community/JoinClanModal';

export function JoinPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();

    const handleClose = () => navigate('/community');
    const handleJoined = () => navigate('/community');

    return (
        <JoinClanModal
            isOpen
            onClose={handleClose}
            onJoined={handleJoined}
            initialCode={code?.toUpperCase()}
            initialTab="code"
        />
    );
}
