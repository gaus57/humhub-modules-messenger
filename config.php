<?php

use humhub\modules\chat\Module;
use humhub\widgets\TopMenu;

return [
    'id' => 'messenger',
    'class' => 'humhub\modules\messenger\Module',
    'namespace' => 'humhub\modules\messenger',
    'events' => [
        ['class' => TopMenu::className(), 'event' => TopMenu::EVENT_INIT, 'callback' => ['humhub\modules\messenger\Module', 'onTopMenuInit']],
    ],
    'urlManagerRules' => [
        'messenger' => 'messenger/main',
        'messenger/s/<alias:[0-9a-zA-Z\-]+>' => 'messenger/main/view-space',
        'messenger/u/<alias:[0-9a-zA-Z\-]+>' => 'messenger/main/view-user',
    ]
];
