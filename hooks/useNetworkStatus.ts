import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export type NetworkStatus = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

/**
 * Ağ bağlantısını izler.
 * isConnected: cihaz bir ağa bağlı mı
 * isInternetReachable: internet erişimi var mı (null = bilinmiyor)
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
  });

  useEffect(() => {
    // İlk değeri hemen al
    NetInfo.fetch().then((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    // Değişimleri dinle
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    return unsubscribe;
  }, []);

  return status;
}
