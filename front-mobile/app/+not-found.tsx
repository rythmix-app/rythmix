import { View, Text, Button, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function NotFoundScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Page introuvable</Text>
            <Link href="/" asChild>
                <Button title="Retour à l’accueil" onPress={() => {}} />
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 20, marginBottom: 16 },
});
