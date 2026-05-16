import { BaseSeeder } from '@adonisjs/lucid/seeders'
import CuratedPlaylist from '#models/curated_playlist'

export default class extends BaseSeeder {
  async run() {
    const playlists = [
      {
        deezerPlaylistId: 15223693943,
        name: 'Rap FR',
        genreLabel: 'Rap FR',
        coverUrl:
          'https://cdn-images.dzcdn.net/images/playlist/bdc88ba888bbb3ba037f895204faaf09/500x500-000000-80-0-0.jpg',
        trackCount: 1731,
      },
      {
        deezerPlaylistId: 15223877503,
        name: 'Rap US',
        genreLabel: 'Rap US',
        coverUrl:
          'https://cdn-images.dzcdn.net/images/playlist/d70276193e9eb1dc63c2e562f4695167/500x500-000000-80-0-0.jpg',
        trackCount: 1920,
      },
      {
        deezerPlaylistId: 15223879163,
        name: 'Pop International',
        genreLabel: 'Pop',
        coverUrl:
          'https://cdn-images.dzcdn.net/images/playlist/94e5101fad07fdfecf4464c651affda6/500x500-000000-80-0-0.jpg',
        trackCount: 1836,
      },
      {
        deezerPlaylistId: 15223880283,
        name: 'Variété FR / Pop FR',
        genreLabel: 'Variété FR',
        coverUrl:
          'https://cdn-images.dzcdn.net/images/playlist/f9d01feb9271c5efa03f83fb7718c5dc/500x500-000000-80-0-0.jpg',
        trackCount: 1696,
      },
      {
        deezerPlaylistId: 15223881203,
        name: 'Rock',
        genreLabel: 'Rock',
        coverUrl:
          'https://cdn-images.dzcdn.net/images/playlist/d559fcba2f94a54d743de840767d0625/500x500-000000-80-0-0.jpg',
        trackCount: 1999,
      },
      {
        deezerPlaylistId: 15223882443,
        name: 'R&B / Soul',
        genreLabel: 'R&B / Soul',
        coverUrl:
          'https://cdn-images.dzcdn.net/images/playlist/da74fab5093777b1dcdd1126d88678fb/500x500-000000-80-0-0.jpg',
        trackCount: 1686,
      },
      {
        deezerPlaylistId: 15223883403,
        name: 'Électro / EDM',
        genreLabel: 'Électro',
        coverUrl:
          'https://cdn-images.dzcdn.net/images/playlist/6ff6f20406c0934487f03aa93fe03aa0/500x500-000000-80-0-0.jpg',
        trackCount: 1954,
      },
      {
        deezerPlaylistId: 15223883723,
        name: 'Latino',
        genreLabel: 'Latino',
        coverUrl:
          'https://cdn-images.dzcdn.net/images/playlist/ff0c1ba48d4b5230fd5444a47a7d66a6/500x500-000000-80-0-0.jpg',
        trackCount: 1842,
      },
    ]

    for (const playlist of playlists) {
      await CuratedPlaylist.updateOrCreate(
        { deezerPlaylistId: playlist.deezerPlaylistId },
        playlist
      )
    }
  }
}
