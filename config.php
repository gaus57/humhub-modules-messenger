<?php

use humhub\modules\chat\Module;
use humhub\widgets\TopMenu;

return [
    'id' => 'chat',
    'class' => 'humhub\modules\chat\Module',
    'namespace' => 'humhub\modules\chat',
    'events' => [
        ['class' => TopMenu::className(), 'event' => TopMenu::EVENT_INIT, 'callback' => ['humhub\modules\chat\Module', 'onTopMenuInit']],
    ],
];
