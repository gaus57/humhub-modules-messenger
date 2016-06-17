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
        $params = require(__DIR__.'/params.php');
        $script = "chat = new Chat(document.location.origin+':".$params['node_server_port']."');";
        $event->sender->view->registerJs($script, \yii\web\View::POS_READY);
    }

}
