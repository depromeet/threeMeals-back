import { DeleteResult, EntityRepository, Not, Repository } from 'typeorm';
import { Service } from 'typedi';
import { Comment } from '../entities/Comment';
import { CommentState, PostState } from '../entities/Enums';
import { BaseRepository } from './BaseRepository';

@Service()
@EntityRepository(Comment)
export class CommentRepository extends BaseRepository<Comment> {
    async saveComment(newComment: Comment): Promise<Comment> {
        return await this.entityManager.save(newComment);
    }

    async findOneByPostIdAndCommentState(postId: string, state: CommentState): Promise<Comment | undefined> {
        return this.findOne({ postId, commentState: state }, { relations: ['account'] });
    }

    async listParentByPostId(args: {
        postId: string,
        limit: number,
        after: string | null
    }): Promise<Comment[]> {
        const { postId, limit, after } = args;
        const comment = 'comment';
        const queryBuilder = this.createQueryBuilder(comment);
        let builder = queryBuilder
            .leftJoinAndSelect(`${comment}.account`, 'account')
            .leftJoinAndSelect(`${comment}.likedComments`, 'likedComments')
            .where(`${comment}.post_id = :postId`, { postId })
            .andWhere(`${comment}.parent_id IS NULL`);

        // comment 는 오래된 순
        builder = after ?
            builder.andWhere(`${comment}.id > :after`, { after }) :
            builder;

        return builder
            .andWhere(`${comment}.comment_state != :commentState`, { commentState: CommentState.Deleted })
            .orderBy(`${comment}.id`, 'ASC')
            .limit(limit)
            .getMany();
    }

    async listChildrenByParentIdAndPostId(args: {
        parentId: string,
        postId: string,
        limit: number,
        after: string | null
    }): Promise<Comment[]> {
        const { parentId, postId, limit, after } = args;
        const comment = 'comment';
        let builder = this.createQueryBuilder(comment)
            .leftJoinAndSelect(`${comment}.account`, 'account')
            .leftJoinAndSelect(`${comment}.likedComments`, 'likedComments')
            .where(`${comment}.parent_id = :parentId`, { parentId })
            .andWhere(`${comment}.post_id = :postId`, { postId });

        // comment 는 오래된 순
        builder = after ?
            builder.andWhere(`${comment}.id > :after`, { after }) :
            builder;

        return builder
            .andWhere(`${comment}.comment_state != :commentState`, { commentState: CommentState.Deleted })
            .orderBy(`${comment}.id`, 'ASC')
            .limit(limit)
            .getMany();
    }

    async listByPostIds(postIds: string[]): Promise<Comment[]> {
        const comment = 'comment';
        const queryBuilder = this.createQueryBuilder(comment);
        return queryBuilder
            .leftJoinAndSelect(`${comment}.account`, 'account')
            .where(`${comment}.post_id IN (:...postIds)`, { postIds })
            .andWhere(`${comment}.comment_state != :commentState`, { commentState: CommentState.Deleted })
            .getMany();
    }

    async findOneById(commentId: string): Promise<Comment | undefined> {
        const comment = 'comment';
        return this.entityManager.createQueryBuilder(Comment, comment)
            .leftJoinAndSelect(`${comment}.likedComments`, 'likedComments')
            .where(`${comment}.id = :commentId`, { commentId })
            .andWhere(`${comment}.comment_state != :commentState`, { commentState: CommentState.Deleted })
            .getOne();
    }

    async getChildrenCountCommentsByIds(commentIds: string[]): Promise<{parentId: string, childrenCount: string}[]> {
        const comment = 'comment';
        return this.createQueryBuilder(comment)
            .select(`${comment}.parent_id AS parentId`)
            .addSelect(`COUNT(*) AS childrenCount`)
            .where(`${comment}.parent_id IN (:...commentIds)`, { commentIds })
            .groupBy('comment.parent_id')
            .getRawMany();
    }
}
