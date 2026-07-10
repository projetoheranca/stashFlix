export type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertListener = (title: string, message: string, buttons?: AlertButton[]) => void;

let alertListener: AlertListener | null = null;

export const registerAlertListener = (listener: AlertListener) => {
  alertListener = listener;
};

export const unregisterAlertListener = () => {
  alertListener = null;
};

export const triggerCustomAlert = (title: string, message: string, buttons?: AlertButton[]) => {
  if (alertListener) {
    alertListener(title, message, buttons);
  } else {
    // Fallback to console warning if listener is not ready
    console.warn("Alerta acionado antes do registro do modal:", title, message);
  }
};
