import { View, Text, Button, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';

export default function RegisterScreen() {
    const handleRegister = () => {
        // TODO: logique de création de compte + connexion
        router.replace('/(tabs)');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Écran d’inscription</Text>

            <Button title="Simuler une inscription" onPress={handleRegister} />

            <Link href="/auth/login" style={styles.link}>
                Retour à la connexion
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 20, marginBottom: 16 },
    link: { marginTop: 16, color: 'blue' },
});
