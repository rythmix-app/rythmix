import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Game from '#models/game'

export default class extends BaseSeeder {
  async run() {
    await Game.createMany([
      {
        name: 'Blind Test',
        description: 'Devinez les morceaux le plus rapidement possible en temps réel.',
      },
      {
        name: 'Qui dit ça ?',
        description: "Identifiez l'artiste à partir de ses citations célèbres.",
      },
      {
        name: 'Tracklist',
        description: "Reconstituez les tracklists d'albums ou identifiez-les.",
      },
      {
        name: 'Blurchette',
        description: "Devinez l'image floutée avant qu'elle ne se révèle complètement.",
      },
      {
        name: 'Plus ou Moins',
        description: 'Comparez la popularité des artistes : streams, abonnés, récompenses.',
      },
      {
        name: 'Fausse Punch',
        description: 'Identifiez les vraies punchlines rap parmi les fausses.',
      },
      {
        name: "Qui l'a mise ?",
        description: 'Devinez qui a ajouté quelle chanson dans la playlist collaborative.',
      },
      {
        name: 'Parkeur',
        description: 'Complétez les paroles manquantes des chansons.',
      },
    ])
  }
}
