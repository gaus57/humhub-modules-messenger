<?php
use yii\helpers\Url;
use yii\helpers\Html;
?>
<li class="chat-page-item" onclick="location.href = '<?= Url::to('messenger/s/'.$item['chat']->url) ?>';">
    <div class="media">
        <div class="pull-left">
            <?= \humhub\modules\space\widgets\Image::widget([
                'space' => $item['chat'],
                'width' => 50,
                'htmlOptions' => [
                    'class' => 'media-object',
                    'style' => 'display: inline-block;',
                ],
                'link' => 'true',
            ]); ?>
        </div>
        <div class="media-body">
            <div class="row">
                <div class="col-md-4">
                    <span class="" style="display: inline-block;">
                        <span class="chat-item-name"><?= Html::encode($item['chat']->name) ?></span>
                        <br>
                        <span class="chat-item-description"><?= Html::encode($item['chat']->description) ?></span>
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
