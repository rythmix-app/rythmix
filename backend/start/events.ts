import emitter from '@adonisjs/core/services/emitter'
import GameFinished from '#events/game_finished'
import TrackLiked from '#events/track_liked'
import AuthSessionCreated from '#events/auth_session_created'

emitter.listen(GameFinished, [() => import('#listeners/on_game_finished')])
emitter.listen(TrackLiked, [() => import('#listeners/on_track_liked')])
emitter.listen(AuthSessionCreated, [() => import('#listeners/on_auth_session_created')])
