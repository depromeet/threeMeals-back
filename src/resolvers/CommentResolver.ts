import { Arg, Args, Ctx, Mutation, Query, Resolver, UseMiddleware } from 'type-graphql';
import { Service } from 'typedi';
import { CommentService } from '../services/CommentService';
import { Comment } from '../entities/Comment';
import { CreateCommentArgs } from './arguments/CommentArgument';
import { AuthMiddleware } from '../middleware/typegraphql/auth';
import { Account } from '../entities/Account';
import { CommentConnection } from '../schemas/CommentConnection';
import { GetCommentsArgument } from './arguments/GetCommentsArgument';
import BaseError from '../exceptions/BaseError';
import { ERROR_CODE } from '../exceptions/ErrorCode';
import { ChildrenCommentConnection } from '../schemas/ChildrenCommentSchema';
import { GetChildrenCommentsArgument } from './arguments/GetChildrenCommentsArgument';
import { MutationResult } from '../schemas/base/MutationResult';
import { CommandBus } from '../common/Command';
import { LikeCommentCommand } from '../command/like-comment/LikeCommentCommand';
import { LikePostsArgument } from './arguments/LikePostsArgument';
import { AuthContext } from '../middleware/express/AuthContext';
import { LikeCommentArgument } from './arguments/LikeCommentArgument';
import { DeleteLikeCommentCommand } from '../command/delete-like-comment/DeleteLikeCommentCommand';

@Service()
@Resolver(() => Comment)
export class CommentResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly commentService: CommentService,
    ) {}

    @Mutation((returns) => Comment)
    @UseMiddleware(AuthMiddleware)
    async createComment(
        @Args() args: CreateCommentArgs,
        @Ctx('account') account?: Account,
    ): Promise<Comment> {
        if (!account) {
            throw new BaseError(ERROR_CODE.UNAUTHORIZED);
        }
        const comment = await this.commentService.createComment({
            content: args.content,
            parentId: args.parentId ? args.parentId : null,
            postId: args.postId,
            secretType: args.secretType,
            account,
        });
        return comment;
    }

    @Mutation((returns) => MutationResult)
    @UseMiddleware(AuthMiddleware)
    async deleteComment(
        @Arg('commentId') commentId: string,
        @Ctx('account') account?: Account,
    ): Promise<MutationResult> {
        if (!account) {
            throw new BaseError(ERROR_CODE.UNAUTHORIZED);
        }
        await this.commentService.deleteComment(commentId, account);
        return MutationResult.fromSuccessResult();
    }

    @Query((returns) => CommentConnection)
    @UseMiddleware(AuthMiddleware)
    async getParentComments(
        @Args() args: GetCommentsArgument,
        @Ctx('account') account?: Account,
    ): Promise<CommentConnection> {
        const comments = await this.commentService.getParentComments({
            myAccountId: account ? account.id : null,
            postId: args.postId,
            after: args.after ? args.after : null,
            limit: args.first,
        });
        return new CommentConnection(comments, 'id');
    }

    @Query((returns) => ChildrenCommentConnection)
    @UseMiddleware(AuthMiddleware)
    async getChildrenComments(
        @Args() args: GetChildrenCommentsArgument,
        @Ctx('account') account?: Account,
    ): Promise<ChildrenCommentConnection> {
        const comments = await this.commentService.getChildrenComments({
            myAccountId: account ? account.id : null,
            postId: args.postId,
            parentId: args.parentId,
            after: args.after ? args.after : null,
            limit: args.first,
        });
        return new ChildrenCommentConnection(comments, 'id');
    }


    @Mutation((returns) => MutationResult)
    @UseMiddleware(AuthMiddleware)
    async createLikeComments(
        @Args() { postId, commentId }: LikeCommentArgument,
        @Ctx('account') account?: Account,
    ): Promise<MutationResult> {
        if (!account) {
            throw new BaseError(ERROR_CODE.UNAUTHORIZED);
        }

        await this.commandBus.send(new LikeCommentCommand(account.id, commentId, postId));
        return MutationResult.fromSuccessResult();
    }

    @Mutation((returns) => MutationResult)
    @UseMiddleware(AuthMiddleware)
    async deleteLikeComments(
        @Args() { postId, commentId }: LikeCommentArgument,
        @Ctx('account') account?: Account,
    ): Promise<MutationResult> {
        if (!account) {
            throw new BaseError(ERROR_CODE.UNAUTHORIZED);
        }

        await this.commandBus.send(new DeleteLikeCommentCommand(account.id, commentId));
        return MutationResult.fromSuccessResult();
    }
}
