import { EntityRepository } from 'typeorm';
import { Service } from 'typedi';
import { BaseRepository } from './BaseRepository';
import { LikeComment } from '../entities/LikeComment';
import { Comment } from '../entities/Comment';

@Service()
@EntityRepository(LikeComment)
export class LikeCommentRepository extends BaseRepository<LikeComment> {
    async addLike(likeComment: LikeComment): Promise<LikeComment> {
        return this.entityManager.save(likeComment);
    }

    async deleteLikes(comment: Comment): Promise<void> {
        await this.entityManager.delete(LikeComment, {
            comment: comment,
        });
    }
}
