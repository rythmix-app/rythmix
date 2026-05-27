import React, { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";

import { Colors } from "@/constants/Colors";
import { useToast } from "@/components/Toast";
import { useAuthStore } from "@/stores/authStore";
import { getUserInfo } from "@/services/authService";
import { setRefreshToken, setToken, setUser } from "@/services/storage";
import { getErrorMessage, OAUTH_REASON } from "@/utils/error-messages";

type CallbackParams = {
  status?: string;
  provider?: string;
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  reason?: string;
  confirmed?: string;
};

const OAUTH_CALLBACK_DEEP_LINK_SEGMENT = "oauth-callback";

const matchesOAuthCallback = (parsed: ReturnType<typeof Linking.parse>) =>
  parsed.path?.endsWith(OAUTH_CALLBACK_DEEP_LINK_SEGMENT) ||
  parsed.hostname?.endsWith(OAUTH_CALLBACK_DEEP_LINK_SEGMENT);

const toCallbackParams = (
  queryParams: ReturnType<typeof Linking.parse>["queryParams"],
): CallbackParams => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(queryParams ?? {})) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
};

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<CallbackParams>();
  const { show } = useToast();
  const processedRef = useRef(false);
  const initialStatus = params.status;

  const handle = useCallback(
    async (p: CallbackParams) => {
      if (processedRef.current) return;
      processedRef.current = true;

      const status = p.status;
      const provider = p.provider;

      if (status === "ok" && p.accessToken) {
        try {
          await setToken(p.accessToken);
          if (p.refreshToken) await setRefreshToken(p.refreshToken);

          const userInfo = await getUserInfo();
          await setUser(userInfo);
          useAuthStore.setState({
            user: userInfo,
            token: p.accessToken,
            refreshToken: p.refreshToken ?? null,
            isAuthenticated: true,
          });

          show({
            type: "success",
            message:
              p.confirmed === "true"
                ? "Connexion confirmée, bienvenue !"
                : "Bienvenue sur Rythmix !",
          });
          router.replace("/(tabs)");
        } catch {
          processedRef.current = false;
          show({
            type: "error",
            message: "Impossible de finaliser la connexion. Réessaie.",
          });
          router.replace("/auth/login");
        }
        return;
      }

      if (status === "pending_confirmation") {
        router.replace({
          pathname: "/auth/oauth-pending-confirmation",
          params: {
            provider: provider ?? "",
            email: p.email ?? "",
          },
        });
        return;
      }

      const reason = p.reason ?? OAUTH_REASON.Error;
      show({
        type: "error",
        message: getErrorMessage(reason) ?? "La connexion a échoué, réessaie.",
      });
      router.replace("/auth/login");
    },
    [show],
  );

  useEffect(() => {
    if (initialStatus) {
      handle(params);
      return;
    }

    const subscription = Linking.addEventListener("url", ({ url }) => {
      const parsed = Linking.parse(url);
      if (!matchesOAuthCallback(parsed)) return;
      handle(toCallbackParams(parsed.queryParams));
    });

    Linking.getInitialURL().then((url) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (!matchesOAuthCallback(parsed)) return;
      handle(toCallbackParams(parsed.queryParams));
    });

    return () => subscription.remove();
    // params is intentionally omitted: the screen processes its initial params
    // exactly once via `initialStatus`; subsequent renders shouldn't re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, initialStatus]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.secondary.turquoise} />
        <Text style={styles.text}>Finalisation de la connexion...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  text: {
    color: "#fff",
    marginTop: 16,
    fontSize: 15,
  },
});
