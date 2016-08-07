<?php

namespace humhub\modules\messenger;

use humhub\libs\ProfileImage;
use yii\helpers\Url;
use Yii;

class Module extends \humhub\components\Module
{

    public function enable()
    {
        parent::enable();

        $profileImage = new ProfileImage('');

        // Создаем файл конфигурации для сервера
        $configContent = file_get_contents($this->getBasePath() . '/server/config.js.exempl');
        $params = require($this->getBasePath() . '/params.php');
        $replace = [
            '@|db_host|@' => preg_replace('/^.+?host=([^;]+);.*$/', "$1", \Yii::$app->db->dsn),
            '@|db_username|@' => \Yii::$app->db->username,
            '@|db_password|@' => \Yii::$app->db->password,
            '@|db_name|@' => preg_replace('/^.+?dbname=(.+)$/', "$1", \Yii::$app->db->dsn),
            '@|port|@' => $params['node_server_port'],
            '@|user_image_path|@' => pathinfo($profileImage->getPath(), PATHINFO_DIRNAME) . '/',
            '@|user_image_url|@' => \Yii::getAlias('@web/uploads/profile_image/'),
            '@|user_image_url_default|@' => $profileImage->getUrl(),
        ];
        $configContent = str_replace(array_keys($replace), array_values($replace), $configContent);
        file_put_contents($this->getBasePath() . '/server/config.js', $configContent);

        return true;
    }

    public static function onTopMenuInit($event)
    {
        if (\Yii::$app->user->isGuest) {
            return;
        }

        $event->sender->addItem(array(
            'label' => Yii::t('MessengerModule.base', 'Messages'),
            'icon' => '<i class="fa fa-envelope-o"></i>',
            'url' => Url::to(['/messenger']),
            'isActive' => (Yii::$app->controller->module && Yii::$app->controller->module->id == 'messenger'),
        ));

        $assets = Assets::register($event->sender->view);
        $params = require(__DIR__ . '/params.php');
        $baseUrl = \Yii::getAlias('@web');
        $assetsUrl = $assets->baseUrl;
        $script = <<<END
if (typeof Messenger == 'function') {
    messenger = new Messenger({
        serverUrl: document.location.origin + ':{$params['node_server_port']}',
        baseUrl: '{$baseUrl}',
        assetsUrl: '{$assetsUrl}'
    });
    $('.p-chat-msg-text:not(.rendered)').each(function(){
        $(this).html(messenger.renderMessageText($(this).text())).addClass('rendered');
    });
}
END;
        $event->sender->view->registerJs($script, \yii\web\View::POS_READY);
    }

}
