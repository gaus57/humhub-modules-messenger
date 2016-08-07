<?php

?>
<div class="media">
                <span class="pull-left">
                    <img class="media-object img-rounded user-image"
                         src="<?= $msg->user->getProfileImage()->getUrl() ?>"
                         width="40"
                         height="40" alt="40x40" data-src="holder.js/40x40"
                         style="display: inline-block; width: 40px; height: 40px;">
                </span>
    <div class="media-body">
        <h4 class="media-heading">
            <span><?= $msg->user->displayName ?></span>
            <small><span class="time"><span title="30 июня 2016 г. - 0:59"><?= \humhub\widgets\TimeAgo::widget(['timestamp' => $msg->created_at]) ?></span></span>                            </small>
        </h4>
        <div class="content p-chat-msg-text"><?= $msg->renderText() ?></div>
    </div>
</div>
