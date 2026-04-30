import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Achievement from '#models/achievement'
import { AchievementType } from '#enums/achievement_type'

export default class extends BaseSeeder {
  async run() {
    const achievements = [
      {
        name: "Bienvenue dans l'arène",
        description: 'Jouer sa toute première partie.',
        type: AchievementType.FirstGame,
        icon: '🏟️',
      },
      {
        name: 'Première victoire',
        description: 'Gagner sa toute première partie multijoueur.',
        type: AchievementType.FirstWin,
        icon: '🥇',
      },
      {
        name: 'Premier pas',
        description: 'Liker son tout premier morceau.',
        type: AchievementType.FirstLike,
        icon: '👣',
      },
      {
        name: "Oreille d'or",
        description: "Trouver la bonne réponse lors d'un blind test musical.",
        type: AchievementType.BlindTestCorrect,
        icon: '🎧',
      },
      {
        name: 'Chasseur de pochettes',
        description: 'Identifier un album à partir de sa pochette floutée.',
        type: AchievementType.CoverGuessCorrect,
        icon: '🖼️',
      },
      {
        name: 'Éclair',
        description: 'Répondre correctement en moins de 3 secondes.',
        type: AchievementType.FastAnswer,
        icon: '⚡',
      },
      {
        name: 'Perfectionniste',
        description: 'Terminer une partie avec un score parfait, sans aucune erreur.',
        type: AchievementType.PerfectGame,
        icon: '💎',
      },
      {
        name: 'Vétéran',
        description: 'Accumuler un grand nombre de parties jouées, tous modes confondus.',
        type: AchievementType.GamesPlayed,
        icon: '🏆',
      },
      {
        name: 'Kamikaze',
        description: "Répondre correctement en moins d'une seconde.",
        type: AchievementType.InstantAnswer,
        icon: '💥',
      },
      {
        name: 'Indécis',
        description: 'Swiper 50 morceaux sans en liker aucun en une seule session.',
        type: AchievementType.NoLikeSession,
        icon: '😶',
      },
      {
        name: 'Obsessionnel',
        description: 'Rejouer exactement le même mode 5 fois de suite.',
        type: AchievementType.SameModeStreak,
        icon: '🔁',
      },
      {
        name: 'Intouchable',
        description: 'Accumuler 500 bonnes réponses au total, tous modes confondus.',
        type: AchievementType.TotalCorrectAnswers,
        icon: '💪',
      },
      {
        name: 'Légende',
        description: 'Jouer 500 parties au total, tous modes confondus.',
        type: AchievementType.TotalGamesPlayed,
        icon: '👑',
      },
      {
        name: 'Mélomane absolu',
        description: 'Liker 500 morceaux via le swipe.',
        type: AchievementType.TotalLikes,
        icon: '🎵',
      },
      {
        name: 'Archiviste',
        description: 'Liker des morceaux via le swipe.',
        type: AchievementType.LikesMilestone,
        icon: '📦',
      },
      {
        name: 'Éclectique',
        description: 'Liker des morceaux de genres musicaux différents.',
        type: AchievementType.GenreDiversity,
        icon: '🎼',
      },
      {
        name: 'Globe-trotter',
        description: 'Liker des artistes provenant de pays différents.',
        type: AchievementType.CountryDiversity,
        icon: '🌍',
      },
      {
        name: 'Coup de cœur',
        description: 'Liker 5 morceaux du même artiste.',
        type: AchievementType.ArtistFan,
        icon: '❤️',
      },
      {
        name: 'Fan du premier jour',
        description: "Créer son compte le jour du lancement officiel de l'app.",
        type: AchievementType.LaunchDaySignup,
        icon: '🎂',
      },
      {
        name: 'Hasard chanceux',
        description: 'Deviner une pochette au niveau de flou maximum.',
        type: AchievementType.MaxBlurGuess,
        icon: '🍀',
      },
      {
        name: 'Le Retour',
        description: "Se reconnecter après 30 jours d'inactivité.",
        type: AchievementType.Comeback,
        icon: '🔄',
      },
    ]

    for (const achievement of achievements) {
      await Achievement.updateOrCreate({ type: achievement.type }, achievement)
    }
  }
}
