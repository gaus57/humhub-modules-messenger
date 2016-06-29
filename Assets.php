<?php

namespace humhub\modules\chat;

use yii\web\AssetBundle;
use Yii;

class Assets extends AssetBundle
{
    public $publishOptions = [
        'forceCopy' => true
    ];

    public $css = [
        'chat.css',
    ];
    
    public $js = [
        'chat.js',
    ];

    public function init()
    {
        $this->sourcePath = dirname(__FILE__) . '/assets';
        $params = require(__DIR__ . '/params.php');
        $this->js[] = Yii::$app->request->hostInfo . ':' . $params['node_server_port'] . '/socket.io/socket.io.js';
        $this->sourcePath = __DIR__ . '/assets';
        parent::init();
    }
}
