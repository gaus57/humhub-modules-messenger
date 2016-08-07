<?php
use yii\helpers\Url;
use yii\helpers\Html;
?>
<li class="chat-page-item" onclick="location.href = '<?= Url::to('messenger/u/'.$item['chat']->username) ?>';">
    <div class="media">
        <div class="pull-left">
            <a href="<?= $item['chat']->getUrl() ?>">
                <img class="media-object img-rounded"
                     src="<?= $item['chat']->getProfileImage()->getUrl() ?>"
                     width="50"
                     height="50" alt="50x50" data-src="holder.js/50x50"
                     style="display: inline-block; width: 50px; height: 50px;">
            </a>
        </div>
        <div class="media-body">
            <div class="row">
                <div class="col-md-4">
                    <span class="" style="display: inline-block;">
                        <span class="chat-item-name"><?= Html::encode($item['chat']->displayName) ?></span>
                        <br>
                        <span class="chat-item-description"><?= Html::encode($item['chat']->profile->title) ?></span>
                    </span>
                </div>
                <div class="col-md-8">
                    <div class="media">
                        <?php if (!empty($item['msg']) && (($item['msg']->objectIsUser && $item['msg']->getIsCurrentUser()) || $item['msg']->objectIsSpace)): ?>
                            <div class="pull-left">
                                <img class="media-object img-rounded"
                                     src="<?= $item['msg']->user->getProfileImage()->getUrl() ?>"
                                     width="40"
                                     height="40" alt="40x40" data-src="holder.js/40x40"
                                     style="display: inline-block; width: 40px; height: 40px;">
                            </div>
                        <?php endif; ?>
                        <div class="media-body chat-msg-text"><?= $item['msg']->renderText() ?></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</li>
