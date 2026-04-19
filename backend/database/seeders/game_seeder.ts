import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Game from '#models/game'

export default class extends BaseSeeder {
  async run() {
    await Game.createMany([
      {
        name: 'Blind Test',
        description: 'Devinez les morceaux le plus rapidement possible en temps réel.',
        isMultiplayer: false,
        isEnabled: false,
      },
      {
        name: 'Qui dit ça ?',
        description: "Identifiez l'artiste à partir de ses citations célèbres.",
        isMultiplayer: true,
        isEnabled: false,
      },
      {
        name: 'Tracklist',
        description: "Reconstituez les tracklists d'albums ou identifiez-les.",
        isMultiplayer: false,
        isEnabled: true,
      },
      {
        name: 'Blurchette',
        description: "Devinez l'image floutée avant qu'elle ne se révèle complètement.",
        isMultiplayer: false,
        isEnabled: true,
      },
      {
        name: 'Plus ou Moins',
        description: 'Comparez la popularité des artistes : streams, abonnés, récompenses.',
        isMultiplayer: false,
        isEnabled: false,
      },
      {
        name: 'Fausse Punch',
        description: 'Identifiez les vraies punchlines rap parmi les fausses.',
        isMultiplayer: true,
        isEnabled: false,
      },
      {
        name: "Qui l'a mise ?",
        description: 'Devinez qui a ajouté quelle chanson dans la playlist collaborative.',
        isMultiplayer: true,
        isEnabled: false,
      },
      {
        name: 'Parkeur',
        description: 'Complétez les paroles manquantes des chansons.',
        isMultiplayer: false,
        isEnabled: false,
      },
    ])
  }
}
