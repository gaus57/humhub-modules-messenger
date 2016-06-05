<?php

namespace humhub\modules\chat;

use yii\web\AssetBundle;
use Yii;

class Assets extends AssetBundle
{

    public $css = [
        'chat.css',
    ];
    public $js = [
        'chat.js',
        //'http://127.0.0.1:3000/socket.io/socket.io.js',
    ];

    public function init()
    {
        $this->js[] = Yii::$app->request->hostInfo.':3000/socket.io/socket.io.js';
        $this->sourcePath = dirname(__FILE__) . '/assets';
        parent::init();
    }

}
