import { View, Text, Button, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';

export default function LoginScreen() {
    const handleLogin = () => {
        // TODO: ici tu mettras ta vraie logique (set token / contexte / etc.)
        router.replace('/(tabs)');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Écran de connexion</Text>

            <Button title="Simuler une connexion" onPress={handleLogin} />

            <Link href="/auth/register" style={styles.link}>
                Aller vers l’inscription
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 20, marginBottom: 16 },
    link: { marginTop: 16, color: 'blue' },
});
