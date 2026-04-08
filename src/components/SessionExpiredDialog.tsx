import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SessionExpiredDialogProps {
  open: boolean;
  onRetry: () => Promise<void>;
  onLoginComplete?: () => void;
}

export function SessionExpiredDialog({ open, onRetry, onLoginComplete }: SessionExpiredDialogProps) {
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);

  const handleLogin = () => {
    navigate(`/auth?redirect=${window.location.pathname}`);
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
      onLoginComplete?.();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sesión expirada</DialogTitle>
        </DialogHeader>
        <p>Tu sesión ha expirado. Por favor, inicia sesión para continuar.</p>
        <DialogFooter>
          <Button onClick={handleLogin} variant="outline">Ir a iniciar sesión</Button>
          <Button onClick={handleRetry} disabled={retrying}>{retrying ? 'Reinentando...' : 'Reintentar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
