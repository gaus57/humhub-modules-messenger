<?php

namespace humhub\modules\chat;

class Module extends \humhub\components\Module
{

    public static function onTopMenuInit($event)
    {
        if (\Yii::$app->user->isGuest) {
            return;
        }

        Assets::register($event->sender->view);
    }

}
