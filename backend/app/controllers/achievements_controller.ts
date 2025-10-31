// TypeScript
import type { HttpContext } from '@adonisjs/core/http'
import Achievement from '#models/achievement'

export default class AchievementsController {
  public async index({ response }: HttpContext) {
    try {
      const achievements = await Achievement.all()
      return response.json({ message: 'Liste des achievements', data: achievements })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'Erreur lors de la récupération', error: String(error) })
    }
  }

  public async create({ request, response }: HttpContext) {
    try {
      const payload = request.only(['description', 'type'])
      const achievement = await Achievement.create(payload)
      return response.status(201).json({ message: 'Achievement créé', data: achievement })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'Erreur lors de la création', error: String(error) })
    }
  }

  public async show({ params, response }: HttpContext) {
    try {
      const achievement = await Achievement.find(params.id)
      if (!achievement) {
        return response.status(404).json({ message: 'Achievement introuvable' })
      }
      return response.json({ message: `Détails de l'achievement ${params.id}`, data: achievement })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'Erreur lors de la récupération', error: String(error) })
    }
  }

  public async update({ params, request, response }: HttpContext) {
    try {
      const achievement = await Achievement.find(params.id)
      if (!achievement) {
        return response.status(404).json({ message: 'Achievement introuvable' })
      }
      achievement.merge(request.only(['description', 'type']))
      await achievement.save()
      return response.json({ message: 'Achievement mis à jour', data: achievement })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'Erreur lors de la mise à jour', error: String(error) })
    }
  }

  public async destroy({ params, response }: HttpContext) {
    try {
      const achievement = await Achievement.find(params.id)
      if (!achievement) {
        return response.status(404).json({ message: 'Achievement introuvable' })
      }
      await achievement.delete()
      return response.json({ message: `Achievement avec ID ${params.id} supprimé` })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'Erreur lors de la suppression', error: String(error) })
    }
  }
}
