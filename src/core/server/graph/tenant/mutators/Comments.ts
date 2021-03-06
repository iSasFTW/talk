import { ERROR_CODES } from "coral-common/errors";
import { ADDITIONAL_DETAILS_MAX_LENGTH } from "coral-common/helpers/validate";
import { mapFieldsetToErrorCodes } from "coral-server/graph/common/errors";
import TenantContext from "coral-server/graph/tenant/context";
import {
  GQLCOMMENT_STATUS,
  GQLCreateCommentDontAgreeInput,
  GQLCreateCommentFlagInput,
  GQLCreateCommentInput,
  GQLCreateCommentReactionInput,
  GQLCreateCommentReplyInput,
  GQLEditCommentInput,
  GQLFeatureCommentInput,
  GQLRemoveCommentDontAgreeInput,
  GQLRemoveCommentReactionInput,
  GQLTAG,
  GQLUnfeatureCommentInput,
} from "coral-server/graph/tenant/schema/__generated__/types";
import {
  addTag,
  create,
  edit,
  removeTag,
} from "coral-server/services/comments";
import {
  createDontAgree,
  createFlag,
  createReaction,
  removeDontAgree,
  removeReaction,
} from "coral-server/services/comments/actions";

import { approve } from "coral-server/services/comments/moderation";
import { publishCommentFeatured } from "coral-server/services/events";
import { validateMaximumLength, WithoutMutationID } from "./util";

export const Comments = (ctx: TenantContext) => ({
  create: ({
    clientMutationId,
    nudge = false,
    ...comment
  }: GQLCreateCommentInput | GQLCreateCommentReplyInput) =>
    mapFieldsetToErrorCodes(
      create(
        ctx.mongo,
        ctx.redis,
        ctx.config,
        ctx.publisher,
        ctx.tenant,
        ctx.user!,
        { authorID: ctx.user!.id, ...comment },
        nudge,
        ctx.now,
        ctx.req
      ),
      {
        "input.body": [
          ERROR_CODES.COMMENT_BODY_EXCEEDS_MAX_LENGTH,
          ERROR_CODES.COMMENT_BODY_TOO_SHORT,
        ],
        "input.parentID": [ERROR_CODES.COMMENT_NOT_FOUND],
        "input.storyID": [ERROR_CODES.STORY_NOT_FOUND],
      }
    ),
  edit: ({ commentID, body }: GQLEditCommentInput) =>
    mapFieldsetToErrorCodes(
      edit(
        ctx.mongo,
        ctx.redis,
        ctx.config,
        ctx.publisher,
        ctx.tenant,
        ctx.user!,
        {
          id: commentID,
          body,
        },
        ctx.now,
        ctx.req
      ),
      {
        "input.body": [
          ERROR_CODES.COMMENT_BODY_EXCEEDS_MAX_LENGTH,
          ERROR_CODES.COMMENT_BODY_TOO_SHORT,
        ],
      }
    ),
  createReaction: ({
    commentID,
    commentRevisionID,
  }: GQLCreateCommentReactionInput) =>
    createReaction(
      ctx.mongo,
      ctx.redis,
      ctx.publisher,
      ctx.tenant,
      ctx.user!,
      {
        commentID,
        commentRevisionID,
      },
      ctx.now
    ),
  removeReaction: ({ commentID }: GQLRemoveCommentReactionInput) =>
    removeReaction(ctx.mongo, ctx.redis, ctx.tenant, ctx.user!, {
      commentID,
    }),
  createDontAgree: ({
    commentID,
    commentRevisionID,
    additionalDetails,
  }: GQLCreateCommentDontAgreeInput) =>
    createDontAgree(
      ctx.mongo,
      ctx.redis,
      ctx.publisher,
      ctx.tenant,
      ctx.user!,
      {
        commentID,
        commentRevisionID,
        // TODO: (wyattjoh) move this validation to the schema when bug is fixed: https://github.com/apollographql/graphql-tools/issues/842
        additionalDetails: validateMaximumLength(
          ADDITIONAL_DETAILS_MAX_LENGTH,
          additionalDetails
        ),
      },
      ctx.now
    ),
  removeDontAgree: ({ commentID }: GQLRemoveCommentDontAgreeInput) =>
    removeDontAgree(ctx.mongo, ctx.redis, ctx.tenant, ctx.user!, {
      commentID,
    }),
  createFlag: ({
    commentID,
    commentRevisionID,
    reason,
    additionalDetails,
  }: GQLCreateCommentFlagInput) =>
    createFlag(
      ctx.mongo,
      ctx.redis,
      ctx.publisher,
      ctx.tenant,
      ctx.user!,
      {
        commentID,
        commentRevisionID,
        reason,
        // TODO: (wyattjoh) move this validation to the schema when bug is fixed: https://github.com/apollographql/graphql-tools/issues/842
        additionalDetails: validateMaximumLength(
          ADDITIONAL_DETAILS_MAX_LENGTH,
          additionalDetails
        ),
      },
      ctx.now
    ),
  feature: ({
    commentID,
    commentRevisionID,
  }: WithoutMutationID<GQLFeatureCommentInput>) =>
    addTag(
      ctx.mongo,
      ctx.tenant,
      commentID,
      commentRevisionID,
      ctx.user!,
      GQLTAG.FEATURED,
      ctx.now
    )
      .then(comment =>
        comment.status !== GQLCOMMENT_STATUS.APPROVED
          ? approve(ctx.mongo, ctx.redis, ctx.publisher, ctx.tenant, {
              commentID,
              commentRevisionID,
              moderatorID: ctx.user!.id,
            })
          : comment
      )
      .then(comment => {
        // Publish that the comment was featured.
        publishCommentFeatured(ctx.publisher, comment);

        // Return it to the next step.
        return comment;
      }),
  unfeature: ({ commentID }: WithoutMutationID<GQLUnfeatureCommentInput>) =>
    removeTag(ctx.mongo, ctx.tenant, commentID, GQLTAG.FEATURED),
});
